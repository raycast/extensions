```fortran
subroutine clasr (
        character side,
        character pivot,
        character direct,
        integer m,
        integer n,
        real, dimension( * ) c,
        real, dimension( * ) s,
        complex, dimension( lda, * ) a,
        integer lda
)
```

CLASR applies a sequence of real plane rotations to a complex matrix
A, from either the left or the right.

When SIDE = 'L', the transformation takes the form

A := P\*A

and when SIDE = 'R', the transformation takes the form

A := A\*P\*\*T

where P is an orthogonal matrix consisting of a sequence of z plane
rotations, with z = M when SIDE = 'L' and z = N when SIDE = 'R',
and P\*\*T is the transpose of P.

When DIRECT = 'F' (Forward sequence), then

P = P(z-1) \* ... \* P(2) \* P(1)

and when DIRECT = 'B' (Backward sequence), then

P = P(1) \* P(2) \* ... \* P(z-1)

where P(k) is a plane rotation matrix defined by the 2-by-2 rotation

R(k) = (  c(k)  s(k) )
= ( -s(k)  c(k) ).

When PIVOT = 'V' (Variable pivot), the rotation is performed
for the plane (k,k+1), i.e., P(k) has the form

P(k) = (  1                                            )
(       ...                                     )
(              1                                )
(                   c(k)  s(k)                  )
(                  -s(k)  c(k)                  )
(                                1              )
(                                     ...       )
(                                            1  )

where R(k) appears as a rank-2 modification to the identity matrix in
rows and columns k and k+1.

When PIVOT = 'T' (Top pivot), the rotation is performed for the
plane (1,k+1), so P(k) has the form

P(k) = (  c(k)                    s(k)                 )
(         1                                     )
(              ...                              )
(                     1                         )
( -s(k)                    c(k)                 )
(                                 1             )
(                                      ...      )
(                                             1 )

where R(k) appears in rows and columns 1 and k+1.

Similarly, when PIVOT = 'B' (Bottom pivot), the rotation is
performed for the plane (k,z), giving P(k) the form

P(k) = ( 1                                             )
(      ...                                      )
(             1                                 )
(                  c(k)                    s(k) )
(                         1                     )
(                              ...              )
(                                     1         )
(                 -s(k)                    c(k) )

where R(k) appears in rows and columns k and z.  The rotations are
performed without ever forming P(k) explicitly.

## Parameters
SIDE : CHARACTER\*1 [in]
> Specifies whether the plane rotation matrix P is applied to
> A on the left or the right.
> = 'L':  Left, compute A := P\*A
> = 'R':  Right, compute A:= A\*P\*\*T

PIVOT : CHARACTER\*1 [in]
> Specifies the plane for which P(k) is a plane rotation
> matrix.
> = 'V':  Variable pivot, the plane (k,k+1)
> = 'T':  Top pivot, the plane (1,k+1)
> = 'B':  Bottom pivot, the plane (k,z)

DIRECT : CHARACTER\*1 [in]
> Specifies whether P is a forward or backward sequence of
> plane rotations.
> = 'F':  Forward, P = P(z-1)\*...\*P(2)\*P(1)
> = 'B':  Backward, P = P(1)\*P(2)\*...\*P(z-1)

M : INTEGER [in]
> The number of rows of the matrix A.  If m <= 1, an immediate
> return is effected.

N : INTEGER [in]
> The number of columns of the matrix A.  If n <= 1, an
> immediate return is effected.

C : REAL array, dimension [in]
> (M-1) if SIDE = 'L'
> (N-1) if SIDE = 'R'
> The cosines c(k) of the plane rotations.

S : REAL array, dimension [in]
> (M-1) if SIDE = 'L'
> (N-1) if SIDE = 'R'
> The sines s(k) of the plane rotations.  The 2-by-2 plane
> rotation part of the matrix P(k), R(k), has the form
> R(k) = (  c(k)  s(k) )
> ( -s(k)  c(k) ).

A : COMPLEX array, dimension (LDA,N) [in,out]
> The M-by-N matrix A.  On exit, A is overwritten by P\*A if
> SIDE = 'R' or by A\*P\*\*T if SIDE = 'L'.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).
