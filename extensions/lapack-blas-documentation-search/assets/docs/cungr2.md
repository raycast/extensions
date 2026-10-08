```fortran
subroutine cungr2 (
        integer m,
        integer n,
        integer k,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( * ) tau,
        complex, dimension( * ) work,
        integer info
)
```

CUNGR2 generates an m by n complex matrix Q with orthonormal rows,
which is defined as the last m rows of a product of k elementary
reflectors of order n

Q  =  H(1)\*\*H H(2)\*\*H . . . H(k)\*\*H

as returned by CGERQF.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix Q. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix Q. N >= M.

K : INTEGER [in]
> The number of elementary reflectors whose product defines the
> matrix Q. M >= K >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the (m-k+i)-th row must contain the vector which
> defines the elementary reflector H(i), for i = 1,2,...,k, as
> returned by CGERQF in the last k rows of its array argument
> A.
> On exit, the m-by-n matrix Q.

LDA : INTEGER [in]
> The first dimension of the array A. LDA >= max(1,M).

TAU : COMPLEX array, dimension (K) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by CGERQF.

WORK : COMPLEX array, dimension (M) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument has an illegal value
