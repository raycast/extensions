```fortran
subroutine chetri_rook (
        character uplo,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        complex, dimension( * ) work,
        integer info
)
```

CHETRI_ROOK computes the inverse of a complex Hermitian indefinite matrix
A using the factorization A = U\*D\*U\*\*H or A = L\*D\*L\*\*H computed by
CHETRF_ROOK.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*D\*U\*\*H;
> = 'L':  Lower triangular, form is A = L\*D\*L\*\*H.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the block diagonal matrix D and the multipliers
> used to obtain the factor U or L as computed by CHETRF_ROOK.
> 
> On exit, if INFO = 0, the (Hermitian) inverse of the original
> matrix.  If UPLO = 'U', the upper triangular part of the
> inverse is formed and the part of A below the diagonal is not
> referenced; if UPLO = 'L' the lower triangular part of the
> inverse is formed and the part of A above the diagonal is
> not referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by CHETRF_ROOK.

WORK : COMPLEX array, dimension (N) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, D(i,i) = 0; the matrix is singular and its
> inverse could not be computed.
