```fortran
subroutine zungr2 (
        integer m,
        integer n,
        integer k,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) tau,
        complex*16, dimension( * ) work,
        integer info
)
```

ZUNGR2 generates an m by n complex matrix Q with orthonormal rows,
which is defined as the last m rows of a product of k elementary
reflectors of order n

Q  =  H(1)\*\*H H(2)\*\*H . . . H(k)\*\*H

as returned by ZGERQF.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix Q. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix Q. N >= M.

K : INTEGER [in]
> The number of elementary reflectors whose product defines the
> matrix Q. M >= K >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the (m-k+i)-th row must contain the vector which
> defines the elementary reflector H(i), for i = 1,2,...,k, as
> returned by ZGERQF in the last k rows of its array argument
> A.
> On exit, the m-by-n matrix Q.

LDA : INTEGER [in]
> The first dimension of the array A. LDA >= max(1,M).

TAU : COMPLEX\*16 array, dimension (K) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by ZGERQF.

WORK : COMPLEX\*16 array, dimension (M) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument has an illegal value
