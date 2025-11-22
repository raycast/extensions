```fortran
subroutine ctrexc (
        character compq,
        integer n,
        complex, dimension( ldt, * ) t,
        integer ldt,
        complex, dimension( ldq, * ) q,
        integer ldq,
        integer ifst,
        integer ilst,
        integer info
)
```

CTREXC reorders the Schur factorization of a complex matrix
A = Q\*T\*Q\*\*H, so that the diagonal element of T with row index IFST
is moved to row ILST.

The Schur form T is reordered by a unitary similarity transformation
Z\*\*H\*T\*Z, and optionally the matrix Q of Schur vectors is updated by
postmultiplying it with Z.

## Parameters
COMPQ : CHARACTER\*1 [in]
> = 'V':  update the matrix Q of Schur vectors;
> = 'N':  do not update Q.

N : INTEGER [in]
> The order of the matrix T. N >= 0.
> If N == 0 arguments ILST and IFST may be any value.

T : COMPLEX array, dimension (LDT,N) [in,out]
> On entry, the upper triangular matrix T.
> On exit, the reordered upper triangular matrix.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= max(1,N).

Q : COMPLEX array, dimension (LDQ,N) [in,out]
> On entry, if COMPQ = 'V', the matrix Q of Schur vectors.
> On exit, if COMPQ = 'V', Q has been postmultiplied by the
> unitary transformation matrix Z which reorders T.
> If COMPQ = 'N', Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= 1, and if
> COMPQ = 'V', LDQ >= max(1,N).

IFST : INTEGER [in]

ILST : INTEGER [in]
> 
> Specify the reordering of the diagonal elements of T:
> The element with row index IFST is moved to row ILST by a
> sequence of transpositions between adjacent elements.
> 1 <= IFST <= N; 1 <= ILST <= N.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
