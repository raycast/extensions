```fortran
subroutine cunghr (
        integer n,
        integer ilo,
        integer ihi,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( * ) tau,
        complex, dimension( * ) work,
        integer lwork,
        integer info
)
```

CUNGHR generates a complex unitary matrix Q which is defined as the
product of IHI-ILO elementary reflectors of order N, as returned by
CGEHRD:

Q = H(ilo) H(ilo+1) . . . H(ihi-1).

## Parameters
N : INTEGER [in]
> The order of the matrix Q. N >= 0.

ILO : INTEGER [in]

IHI : INTEGER [in]
> 
> ILO and IHI must have the same values as in the previous call
> of CGEHRD. Q is equal to the unit matrix except in the
> submatrix Q(ilo+1:ihi,ilo+1:ihi).
> 1 <= ILO <= IHI <= N, if N > 0; ILO=1 and IHI=0, if N=0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the vectors which define the elementary reflectors,
> as returned by CGEHRD.
> On exit, the N-by-N unitary matrix Q.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,N).

TAU : COMPLEX array, dimension (N-1) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by CGEHRD.

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= IHI-ILO.
> For optimum performance LWORK >= (IHI-ILO)\*NB, where NB is
> the optimal blocksize.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
