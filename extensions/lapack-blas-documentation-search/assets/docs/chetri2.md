```fortran
subroutine chetri2 (
        character uplo,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        complex, dimension( * ) work,
        integer lwork,
        integer info
)
```

CHETRI2 computes the inverse of a COMPLEX hermitian indefinite matrix
A using the factorization A = U\*D\*U\*\*T or A = L\*D\*L\*\*T computed by
CHETRF. CHETRI2 set the LEADING DIMENSION of the workspace
before calling CHETRI2X that actually computes the inverse.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*D\*U\*\*T;
> = 'L':  Lower triangular, form is A = L\*D\*L\*\*T.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the block diagonal matrix D and the multipliers
> used to obtain the factor U or L as computed by CHETRF.
> 
> On exit, if INFO = 0, the (symmetric) inverse of the original
> matrix.  If UPLO = 'U', the upper triangular part of the
> inverse is formed and the part of A below the diagonal is not
> referenced; if UPLO = 'L' the lower triangular part of the
> inverse is formed and the part of A above the diagonal is
> not referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by CHETRF.

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If N = 0, LWORK >= 1, else LWORK >= (N+NB+1)\*(NB+3).
> If LWORK = -1, then a workspace query is assumed; the routine
> calculates:
> - the optimal size of the WORK array, returns
> this value as the first entry of the WORK array,
> - and no error message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, D(i,i) = 0; the matrix is singular and its
> inverse could not be computed.
