```fortran
subroutine sgelq (
        integer m,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) t,
        integer tsize,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SGELQ computes an LQ factorization of a real M-by-N matrix A:

A = ( L 0 ) \*  Q

where:

Q is a N-by-N orthogonal matrix;
L is a lower-triangular M-by-M matrix;
0 is a M-by-(N-M) zero matrix, if M < N.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit, the elements on and below the diagonal of the array
> contain the M-by-min(M,N) lower trapezoidal matrix L
> (L is lower triangular if M <= N);
> the elements above the diagonal are used to store part of the
> data structure to represent Q.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

T : REAL array, dimension (MAX(5,TSIZE)) [out]
> On exit, if INFO = 0, T(1) returns optimal (or either minimal
> or optimal, if query is assumed) TSIZE. See TSIZE for details.
> Remaining T contains part of the data structure used to represent Q.
> If one wants to apply or construct Q, then one needs to keep T
> (in addition to A) and pass it to further subroutines.

TSIZE : INTEGER [in]
> If TSIZE >= 5, the dimension of the array T.
> If TSIZE = -1 or -2, then a workspace query is assumed. The routine
> only calculates the sizes of the T and WORK arrays, returns these
> values as the first entries of the T and WORK arrays, and no error
> message related to T or WORK is issued by XERBLA.
> If TSIZE = -1, the routine calculates optimal size of T for the
> optimum performance and returns this value in T(1).
> If TSIZE = -2, the routine calculates minimal size of T and
> returns this value in T(1).

WORK : (workspace) REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) contains optimal (or either minimal
> or optimal, if query was assumed) LWORK.
> See LWORK for details.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= 1.
> If LWORK = -1 or -2, then a workspace query is assumed. The routine
> only calculates the sizes of the T and WORK arrays, returns these
> values as the first entries of the T and WORK arrays, and no error
> message related to T or WORK is issued by XERBLA.
> If LWORK = -1, the routine calculates optimal size of WORK for the
> optimal performance and returns this value in WORK(1).
> If LWORK = -2, the routine calculates minimal size of WORK and
> returns this value in WORK(1).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
