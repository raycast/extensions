```fortran
subroutine dorg2r (
        integer m,
        integer n,
        integer k,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) tau,
        double precision, dimension( * ) work,
        integer info
)
```

DORG2R generates an m by n real matrix Q with orthonormal columns,
which is defined as the first n columns of a product of k elementary
reflectors of order m

Q  =  H(1) H(2) . . . H(k)

as returned by DGEQRF.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix Q. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix Q. M >= N >= 0.

K : INTEGER [in]
> The number of elementary reflectors whose product defines the
> matrix Q. N >= K >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the i-th column must contain the vector which
> defines the elementary reflector H(i), for i = 1,2,...,k, as
> returned by DGEQRF in the first k columns of its array
> argument A.
> On exit, the m-by-n matrix Q.

LDA : INTEGER [in]
> The first dimension of the array A. LDA >= max(1,M).

TAU : DOUBLE PRECISION array, dimension (K) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by DGEQRF.

WORK : DOUBLE PRECISION array, dimension (N) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument has an illegal value
