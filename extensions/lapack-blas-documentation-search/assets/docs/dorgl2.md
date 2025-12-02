```fortran
subroutine dorgl2 (
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

DORGL2 generates an m by n real matrix Q with orthonormal rows,
which is defined as the first m rows of a product of k elementary
reflectors of order n

Q  =  H(k) . . . H(2) H(1)

as returned by DGELQF.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix Q. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix Q. N >= M.

K : INTEGER [in]
> The number of elementary reflectors whose product defines the
> matrix Q. M >= K >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the i-th row must contain the vector which defines
> the elementary reflector H(i), for i = 1,2,...,k, as returned
> by DGELQF in the first k rows of its array argument A.
> On exit, the m-by-n matrix Q.

LDA : INTEGER [in]
> The first dimension of the array A. LDA >= max(1,M).

TAU : DOUBLE PRECISION array, dimension (K) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by DGELQF.

WORK : DOUBLE PRECISION array, dimension (M) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument has an illegal value
