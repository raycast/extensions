```fortran
subroutine dorm2l (
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) tau,
        double precision, dimension( ldc, * ) c,
        integer ldc,
        double precision, dimension( * ) work,
        integer info
)
```

DORM2L overwrites the general real m by n matrix C with

Q \* C  if SIDE = 'L' and TRANS = 'N', or

Q\*\*T \* C  if SIDE = 'L' and TRANS = 'T', or

C \* Q  if SIDE = 'R' and TRANS = 'N', or

C \* Q\*\*T if SIDE = 'R' and TRANS = 'T',

where Q is a real orthogonal matrix defined as the product of k
elementary reflectors

Q = H(k) . . . H(2) H(1)

as returned by DGEQLF. Q is of order m if SIDE = 'L' and of order n
if SIDE = 'R'.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*T from the Left
> = 'R': apply Q or Q\*\*T from the Right

TRANS : CHARACTER\*1 [in]
> = 'N': apply Q  (No transpose)
> = 'T': apply Q\*\*T (Transpose)

M : INTEGER [in]
> The number of rows of the matrix C. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix C. N >= 0.

K : INTEGER [in]
> The number of elementary reflectors whose product defines
> the matrix Q.
> If SIDE = 'L', M >= K >= 0;
> if SIDE = 'R', N >= K >= 0.

A : DOUBLE PRECISION array, dimension (LDA,K) [in]
> The i-th column must contain the vector which defines the
> elementary reflector H(i), for i = 1,2,...,k, as returned by
> DGEQLF in the last k columns of its array argument A.

LDA : INTEGER [in]
> The leading dimension of the array A.
> If SIDE = 'L', LDA >= max(1,M);
> if SIDE = 'R', LDA >= max(1,N).

TAU : DOUBLE PRECISION array, dimension (K) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by DGEQLF.

C : DOUBLE PRECISION array, dimension (LDC,N) [in,out]
> On entry, the m by n matrix C.
> On exit, C is overwritten by Q\*C or Q\*\*T\*C or C\*Q\*\*T or C\*Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : DOUBLE PRECISION array, dimension [out]
> (N) if SIDE = 'L',
> (M) if SIDE = 'R'

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
