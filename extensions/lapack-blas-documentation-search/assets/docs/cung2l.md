```fortran
subroutine cung2l (
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

CUNG2L generates an m by n complex matrix Q with orthonormal columns,
which is defined as the last n columns of a product of k elementary
reflectors of order m

Q  =  H(k) . . . H(2) H(1)

as returned by CGEQLF.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix Q. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix Q. M >= N >= 0.

K : INTEGER [in]
> The number of elementary reflectors whose product defines the
> matrix Q. N >= K >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the (n-k+i)-th column must contain the vector which
> defines the elementary reflector H(i), for i = 1,2,...,k, as
> returned by CGEQLF in the last k columns of its array
> argument A.
> On exit, the m-by-n matrix Q.

LDA : INTEGER [in]
> The first dimension of the array A. LDA >= max(1,M).

TAU : COMPLEX array, dimension (K) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by CGEQLF.

WORK : COMPLEX array, dimension (N) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument has an illegal value
